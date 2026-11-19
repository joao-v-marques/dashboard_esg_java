package com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LossProbabilityRequest(
        @NotBlank(message = "Preencha o nome da probabilidade de perda")
        @Size(max = 255, message = "O nome da probabilidade de perda deve conter no máximo 255 caracteres")
        String name
) {
}
