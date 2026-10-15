package com.joao_v_marques.dashboard_esg.shared.units.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UnitRequest(
        @NotBlank(message = "Informe o nome da unidade.")
        @Size(max = 155, message = "O nome da unidade deve conter no máximo 155 caracteres.")
        String name,

        @NotBlank(message = "Informe um código para a unidade.")
        @Size(max = 20, message = "O código da unidade deve conter no máximo 20 caracteres.")
        String code
) {
}
