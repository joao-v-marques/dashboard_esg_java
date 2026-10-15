package com.joao_v_marques.dashboard_esg.users.sector.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SectorRequest(
        @NotBlank(message = "Preencha o nome do setor")
        @Size(max = 100, message = "O nome do setor deve conter no máximo 100 caracteres")
        String name
) {
}
