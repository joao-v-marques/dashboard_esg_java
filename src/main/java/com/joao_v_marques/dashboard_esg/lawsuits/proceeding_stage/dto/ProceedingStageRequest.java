package com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProceedingStageRequest(
        @NotBlank(message = "Preencha o nome do trâmite")
        @Size(max = 255, message = "O nome do trâmite deve conter no máximo 255 caracteres")
        String name
) {
}
