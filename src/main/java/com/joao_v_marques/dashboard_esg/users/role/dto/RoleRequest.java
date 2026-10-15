package com.joao_v_marques.dashboard_esg.users.role.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RoleRequest(
        @NotBlank(message = "Preencha o nome da role")
        @Size(max = 100, message = "O campo deve ter no máximo 100 caracteres")
        String name
) {
}
