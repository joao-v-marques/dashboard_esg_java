package com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

// Endereço e usuário técnico do certificados-cooperados. Credencial ausente não impede a aplicação de subir:
// a validação acontece no uso (CertificadosCooperadosClient), para só a aba de Cooperados responder 502
@ConfigurationProperties("app.integrations.certificados-cooperados")
public record CertificadosCooperadosProperties(
        String baseUrl,
        String username,
        String password,
        // Fallback, só usado se não der para ler o exp do JWT retornado no login
        Duration tokenTtl
) {

    public CertificadosCooperadosProperties {
        // Sem barra no final: base-url com barra sobrando gera URL duplamente barrada, que o Spring Security
        // do outro app não reconhece como rota pública e redireciona pro login em vez de autenticar
        if (baseUrl != null) {
            baseUrl = baseUrl.strip().replaceAll("/+$", "");
        }
        if (tokenTtl == null) {
            tokenTtl = Duration.ofHours(1);
        }
    }

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank()
                && username != null && !username.isBlank()
                && password != null && !password.isBlank();
    }
}
