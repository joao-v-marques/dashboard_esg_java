package com.joao_v_marques.dashboard_esg.users.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

// Request de update do usuário (a senha é atualizada separadamente)
public record UserUpdateRequest(
        @Size(max = 255, message = "O nome do usuário deve conter no máximo 255 caracteres")
        String name,

        @NotBlank(message = "Preencha o campo de usuário")
        @Size(max = 100, message = "O usuário deve conter no máximo 100 caracteres")
        String username,

        @Email(message = "Informe um e-mail válido")
        @Size(max = 255, message = "O e-mail deve conter no máximo 255 caracteres")
        String email,

        @NotNull(message = "Informe a função do usuário")
        @Positive(message = "Perfil de acesso inválido")
        Integer roleId,

        @NotNull(message = "Informe o setor do usuário")
        @Positive(message = "Setor inválido")
        Integer sectorId
) {
}
