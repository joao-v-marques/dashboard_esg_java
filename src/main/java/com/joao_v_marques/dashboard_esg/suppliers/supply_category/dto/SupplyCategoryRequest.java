package com.joao_v_marques.dashboard_esg.suppliers.supply_category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupplyCategoryRequest(
        @NotBlank(message = "Preencha o nome da categoria de fornecimento")
        @Size(max = 255, message = "O nome da categoria de fornecimento deve conter no máximo 255 caracteres")
        String name
) {
}
