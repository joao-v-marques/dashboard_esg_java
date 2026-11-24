package com.joao_v_marques.dashboard_esg.shared.banks.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BankRequest(
        @NotBlank(message = "Informe o código do banco.")
        @Pattern(regexp = "\\d{3}", message = "O código do banco deve conter 3 dígitos, apenas números.")
        String code,

        @NotBlank(message = "Informe o nome do banco.")
        @Size(max = 150, message = "O nome do banco deve conter no máximo 150 caracteres.")
        String name
) {
}
