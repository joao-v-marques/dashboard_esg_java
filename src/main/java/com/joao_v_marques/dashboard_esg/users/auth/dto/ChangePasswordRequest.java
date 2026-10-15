package com.joao_v_marques.dashboard_esg.users.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Request para o usuário logado trocar a própria senha
public record ChangePasswordRequest(
        @NotBlank(message = "Informe a senha atual")
        String currentPassword,

        @NotBlank(message = "Informe a nova senha")
        @Size(min = 4, max = 72, message = "A senha deve ter entre 4 e 72 caracteres")
        String newPassword
) {
}
