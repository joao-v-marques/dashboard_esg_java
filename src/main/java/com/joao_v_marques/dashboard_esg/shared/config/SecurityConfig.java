package com.joao_v_marques.dashboard_esg.shared.config;

import com.joao_v_marques.dashboard_esg.shared.security.*;
import com.joao_v_marques.dashboard_esg.users.role.Role;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import tools.jackson.databind.ObjectMapper;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtService jwtService, CustomUserDetailsService userDetailsService, ObjectMapper objectMapper) throws Exception {
        JwtAuthenticationFilter jwtAuthenticationFilter = new JwtAuthenticationFilter(jwtService, userDetailsService);
        RestAuthenticationEntryPoint restAuthenticationEntryPoint = new RestAuthenticationEntryPoint(objectMapper);
        RestAccessDeniedHandler restAccessDeniedHandler = new RestAccessDeniedHandler(objectMapper);

        return http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/login", "/api/auth/login", "/api/auth/logout", "/error", "/css/**", "/js/**", "/img/**").permitAll()

                        // Tela e API de administração: só ADMINISTRATOR. O 403 fora de /api/** redireciona para home?erro=sem-acesso
                        .requestMatchers("/settings", "/api/users/**", "/api/roles/**", "/api/sectors/**").hasRole(Role.ADMINISTRATOR)

                        // Unidades são compartilhadas entre módulos: todos leem, só ADMINISTRATOR cadastra/edita
                        .requestMatchers(HttpMethod.POST, "/api/units/**").hasRole(Role.ADMINISTRATOR)
                        .requestMatchers(HttpMethod.PUT, "/api/units/**").hasRole(Role.ADMINISTRATOR)

                        // Bancos também são compartilhados: todos leem, só ADMINISTRATOR cadastra/edita/ativa/desativa
                        .requestMatchers(HttpMethod.POST, "/api/banks/**").hasRole(Role.ADMINISTRATOR)
                        .requestMatchers(HttpMethod.PUT, "/api/banks/**").hasRole(Role.ADMINISTRATOR)
                        .requestMatchers(HttpMethod.PATCH, "/api/banks/**").hasRole(Role.ADMINISTRATOR)

                        // Dashboard: quem vê ao menos um tema (Resíduos ou NIP's). Cada aba é escondida no front
                        // conforme a role, e a API de cada tema continua exigindo a própria role
                        .requestMatchers("/dashboard").hasAnyRole(Role.EMPLOYEE_WASTES, Role.EMPLOYEE_ANS)

                        // Módulo de resíduos: EMPLOYEE_WASTES e acima (MANAGER, ADMINISTRATOR) pela hierarquia
                        .requestMatchers("/wastes", "/api/waste-records/**", "/api/waste-types/**").hasRole(Role.EMPLOYEE_WASTES)

                        // Aba de Cooperados do dashboard (dados vindos do certificados-cooperados): MANAGER e acima
                        .requestMatchers("/api/cooperative-members/**").hasRole(Role.MANAGER)

                        // Módulo de NIP's (telas e cadastros de NIP, status e natureza): EMPLOYEE_ANS e acima (EMPLOYEE_LEGAL, MANAGER, ADMINISTRATOR)
                        .requestMatchers("/nips/**", "/api/nips/**", "/api/nip-status/**", "/api/nip-natures/**").hasRole(Role.EMPLOYEE_ANS)

                        // Módulo de processos (telas e cadastros de objeto, trâmite, status, probabilidade de perda, órgão julgador, processos e recursos): EMPLOYEE_LEGAL e acima (MANAGER, ADMINISTRATOR).
                        // EMPLOYEE_ANS fica de fora: só acessa NIP's
                        .requestMatchers("/lawsuits/**", "/api/subject-matters/**", "/api/proceeding-stages/**", "/api/lawsuit-status/**", "/api/loss-probabilities/**", "/api/judging-bodies/**", "/api/lawsuits/**", "/api/lawsuit-appeals/**").hasRole(Role.EMPLOYEE_LEGAL)

                        .anyRequest().authenticated())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf -> csrf.disable())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(restAuthenticationEntryPoint)
                        .accessDeniedHandler(restAccessDeniedHandler))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    // Quem tem a role da esquerda herda as da direita; o authorizeHttpRequests usa este bean automaticamente.
    // Novos módulos entram como MANAGER > EMPLOYEE_<MODULO>.
    // EMPLOYEE_LEGAL (NIP's + Processos) implica EMPLOYEE_ANS (só NIP's)
    @Bean
    static RoleHierarchy roleHierarchy() {
        return RoleHierarchyImpl.withDefaultRolePrefix()
                .role(Role.ADMINISTRATOR).implies(Role.MANAGER)
                .role(Role.MANAGER).implies(Role.EMPLOYEE_WASTES, Role.EMPLOYEE_LEGAL)
                .role(Role.EMPLOYEE_LEGAL).implies(Role.EMPLOYEE_ANS)
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationProvider authenticationProvider(CustomUserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
