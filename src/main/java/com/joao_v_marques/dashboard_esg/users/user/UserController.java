package com.joao_v_marques.dashboard_esg.users.user;

import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import com.joao_v_marques.dashboard_esg.users.user.dto.ResetPasswordRequest;
import com.joao_v_marques.dashboard_esg.users.user.dto.UserRequest;
import com.joao_v_marques.dashboard_esg.users.user.dto.UserResponse;
import com.joao_v_marques.dashboard_esg.users.user.dto.UserUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // GET de todos os usuários cadastrados no sistema
    @GetMapping
    public List<UserResponse> findAll() {
        return userService.findAll();
    }

    // POST de um novo usuário no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserRequest request) {
        UserResponse created = userService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de um usuário já existente (não altera a senha)
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserResponse> update(@PathVariable Integer id, @Valid @RequestBody UserUpdateRequest request) {
        UserResponse updated = userService.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para o administrador redefinir a senha de um usuário
    @PatchMapping(value = "/{id}/password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> resetPassword(@PathVariable Integer id, @Valid @RequestBody ResetPasswordRequest request) {
        userService.resetPassword(id, request);

        return ResponseEntity.noContent().build();
    }

    // PATCH para desativar um usuário (soft delete)
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<UserResponse> deactivate(@PathVariable Integer id, @AuthenticationPrincipal UserPrincipal principal) {
        UserResponse deactivated = userService.deactivate(id, principal.getId());

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar um usuário
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<UserResponse> reactivate(@PathVariable Integer id) {
        UserResponse reactivated = userService.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}
