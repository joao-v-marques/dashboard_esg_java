package com.joao_v_marques.dashboard_esg.users.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Request para o administrador redefinir a senha de um usuário
public record ResetPasswordRequest(
        @NotBlank(message = "Informe a nova senha")
        @Size(min = 4, max = 72, message = "A senha deve ter entre 4 e 72 caracteres")
        String newPassword
) {
}
