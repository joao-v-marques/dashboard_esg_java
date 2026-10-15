package com.joao_v_marques.dashboard_esg.users.auth;

import com.joao_v_marques.dashboard_esg.shared.security.JwtService;
import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import com.joao_v_marques.dashboard_esg.users.auth.dto.AuthRequest;
import com.joao_v_marques.dashboard_esg.users.auth.dto.AuthResponse;
import com.joao_v_marques.dashboard_esg.users.auth.dto.ChangePasswordRequest;
import com.joao_v_marques.dashboard_esg.users.auth.dto.CurrentUserResponse;
import com.joao_v_marques.dashboard_esg.users.user.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserService userService;

    private final boolean secureCookie;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService, UserService userService, @Value("${app.security.cookie-secure}") boolean secureCookie) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userService = userService;
        this.secureCookie = secureCookie;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request, HttpServletRequest httpRequest) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        String token = jwtService.generateToken(request.username());

        ResponseCookie cookie = accessTokenCookie(token,
                Duration.ofMillis(jwtService.getExpirationMillis()),
                httpRequest.getContextPath());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new AuthResponse(token));
    }

    // dados mínimos do usuário logado para a interface (o JS não lê o cookie HttpOnly)
    @GetMapping("/me")
    public CurrentUserResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return new CurrentUserResponse(principal.getName(), principal.getUsername(), principal.getRoleName());
    }

    // PATCH para o usuário logado trocar a própria senha
    @PatchMapping(value = "/me/password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        userService.changeOwnPassword(principal.getId(), request);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {

        ResponseCookie cookie = accessTokenCookie("", Duration.ZERO, httpRequest.getContextPath());

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .build();
    }

    private ResponseCookie accessTokenCookie(String value, Duration maxAge, String conextPath) {
        return ResponseCookie.from("access_token", value)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path(conextPath)
                .maxAge(maxAge)
                .build();
    }
}
