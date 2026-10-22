package com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados;

import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto.AnnualReport;
import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto.BandsReport;
import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto.LoginRequest;
import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto.LoginResponse;
import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto.Occurrence;
import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto.SatisfactionSurvey;
import com.joao_v_marques.dashboard_esg.shared.exceptions.UpstreamException;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

/**
 * Cliente HTTP da API do certificados-cooperados (outra aplicação, banco próprio). Autentica como o usuário
 * técnico (app.integrations.certificados-cooperados.username) e reaproveita o JWT entre chamadas, para não logar
 * de novo a cada indicador.
 *
 * Toda chamada tem timeout (spring.http.clients) e toda falha de rede/HTTP vira UpstreamException (502), nunca
 * um 500 genérico. Quem chama (CooperativeMemberDashboardService) só monta os indicadores.
 *
 * Token em cache na própria instância (singleton): synchronized porque duas requisições podem achar o cache
 * expirado ao mesmo tempo e logar duas vezes.
 */
@Component
public class CertificadosCooperadosClient {

    // Renova um pouco antes do exp real do JWT, para nunca sair com um token que expira no meio do caminho
    private static final Duration TOKEN_REFRESH_MARGIN = Duration.ofSeconds(60);

    private final CertificadosCooperadosProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    private String cachedToken;
    private Instant cachedExp = Instant.EPOCH;

    public CertificadosCooperadosClient(CertificadosCooperadosProperties properties, ObjectMapper objectMapper, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder.build();
    }

    public AnnualReport findAnnualReport(int year) {
        return get("/api/v1/cooperative-members/annual-report?year={year}", new ParameterizedTypeReference<AnnualReport>() {}, year);
    }

    public BandsReport findBandsReport(int year) {
        return get("/api/v1/bonus-points/bands-report?year={year}", new ParameterizedTypeReference<BandsReport>() {}, year);
    }

    // Não filtra por ano: quem chama filtra pelo surveyYear
    public List<SatisfactionSurvey> findSatisfactionSurveys() {
        return get("/api/v1/satisfaction-surveys?order=desc", new ParameterizedTypeReference<List<SatisfactionSurvey>>() {});
    }

    // Também não filtra por ano: quem chama filtra pelo occurrenceDate
    public List<Occurrence> findOccurrences() {
        return get("/api/v1/occurrences", new ParameterizedTypeReference<List<Occurrence>>() {});
    }

    // GET autenticado. Em caso de 401 (token expirado por diferença de relógio, ou secret trocado do outro lado),
    // reloga uma única vez e tenta de novo, sem loop, para uma falha persistente não virar chamadas em cascata
    private <T> T get(String path, ParameterizedTypeReference<T> responseType, Object... uriVariables) {
        try {
            try {
                return request(path, getToken(false), responseType, uriVariables);
            } catch (HttpClientErrorException.Unauthorized e) {
                return request(path, getToken(true), responseType, uriVariables);
            }
        } catch (RestClientResponseException e) {
            throw new UpstreamException(endpoint(path) + " respondeu " + e.getStatusCode().value(), e);
        } catch (ResourceAccessException e) {
            throw new UpstreamException("Falha ao chamar " + endpoint(path) + " no certificados-cooperados: " + e.getMessage(), e);
        } catch (RestClientException e) {
            throw new UpstreamException("Resposta inesperada de " + endpoint(path) + " no certificados-cooperados", e);
        }
    }

    private <T> T request(String path, String token, ParameterizedTypeReference<T> responseType, Object... uriVariables) {
        T body = restClient.get()
                .uri(properties.baseUrl() + path, uriVariables)
                .headers(headers -> headers.setBearerAuth(token))
                .retrieve()
                .body(responseType);

        if (body == null) {
            throw new UpstreamException(endpoint(path) + " não retornou conteúdo");
        }

        return body;
    }

    private synchronized String getToken(boolean forceRefresh) {
        if (!forceRefresh && cachedToken != null && Instant.now().isBefore(cachedExp.minus(TOKEN_REFRESH_MARGIN))) {
            return cachedToken;
        }

        return login();
    }

    // Autentica o usuário técnico e atualiza o cache. Chamado só dentro do getToken (synchronized)
    private String login() {
        // Validado no uso, e não na subida: sem credencial só a aba de Cooperados fica fora, o resto da aplicação sobe
        if (!properties.isConfigured()) {
            throw new UpstreamException("Integração com o certificados-cooperados não configurada "
                    + "(CERT_COOP_URL / CERT_COOP_USERNAME / CERT_COOP_PASSWORD)");
        }

        LoginResponse response;
        try {
            response = restClient.post()
                    .uri(properties.baseUrl() + "/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new LoginRequest(properties.username(), properties.password()))
                    .retrieve()
                    .body(LoginResponse.class);
        } catch (RestClientResponseException e) {
            throw new UpstreamException("Falha ao autenticar no certificados-cooperados: respondeu " + e.getStatusCode().value(), e);
        } catch (RestClientException e) {
            throw new UpstreamException("Falha ao autenticar no certificados-cooperados: " + e.getMessage(), e);
        }

        if (response == null || response.token() == null || response.token().isBlank()) {
            throw new UpstreamException("Login no certificados-cooperados não retornou token");
        }

        cachedToken = response.token();
        cachedExp = expirationOf(cachedToken);

        return cachedToken;
    }

    // Lê o exp do payload sem validar a assinatura: o secret é do outro app, e aqui o token só é repassado.
    // Se não der para ler (não deveria acontecer), usa o token-ttl configurado
    private Instant expirationOf(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length == 3) {
                JsonNode exp = objectMapper.readTree(new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)).get("exp");
                if (exp != null && exp.isNumber()) {
                    return Instant.ofEpochSecond(exp.longValue());
                }
            }
        } catch (IllegalArgumentException | JacksonException e) {
            // cai no fallback abaixo
        }

        return Instant.now().plus(properties.tokenTtl());
    }

    // Path sem a query string, para a mensagem de erro não mostrar o template ({year})
    private String endpoint(String path) {
        int query = path.indexOf('?');
        return query >= 0 ? path.substring(0, query) : path;
    }
}
