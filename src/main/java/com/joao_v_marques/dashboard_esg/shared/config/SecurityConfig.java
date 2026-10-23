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

                        // Módulo de resíduos: EMPLOYEE_WASTES e acima (MANAGER, ADMINISTRATOR) pela hierarquia.
                        // As abas de outros temas do dashboard são escondidas no front; as APIs delas exigirão MANAGER
                        .requestMatchers("/dashboard", "/wastes", "/api/waste-records/**", "/api/waste-types/**").hasRole(Role.EMPLOYEE_WASTES)

                        // Aba de Cooperados do dashboard (dados vindos do certificados-cooperados): MANAGER e acima
                        .requestMatchers("/api/cooperative-members/**").hasRole(Role.MANAGER)

                        // Módulo de NIP's (telas e cadastros de NIP, status e natureza): EMPLOYEE_LEGAL e acima (MANAGER, ADMINISTRATOR)
                        .requestMatchers("/nips/**", "/api/nips/**", "/api/nip-status/**", "/api/nip-natures/**").hasRole(Role.EMPLOYEE_LEGAL)

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
    // Novos módulos entram como MANAGER > EMPLOYEE_<MODULO>
    @Bean
    static RoleHierarchy roleHierarchy() {
        return RoleHierarchyImpl.withDefaultRolePrefix()
                .role(Role.ADMINISTRATOR).implies(Role.MANAGER)
                .role(Role.MANAGER).implies(Role.EMPLOYEE_WASTES, Role.EMPLOYEE_LEGAL)
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
