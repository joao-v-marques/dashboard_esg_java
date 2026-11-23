package com.joao_v_marques.dashboard_esg.lawsuits.judging_body.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JudgingBodyRequest(
        @NotBlank(message = "Preencha o nome do órgão julgador")
        @Size(max = 255, message = "O nome do órgão julgador deve conter no máximo 255 caracteres")
        String name
) {
}
