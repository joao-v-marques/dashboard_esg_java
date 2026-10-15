package com.joao_v_marques.dashboard_esg.wastes.waste_type.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record WasteTypeRequest(
        @NotBlank(message = "Informe o nome do tipo de resíduo.")
        @Size(max = 100, message = "O nome do resíduo deve conter no máximo 100 caracteres.")
        String name,

        @NotBlank(message = "Informe um código para o tipo de resíduo.")
        @Size(max = 20, message = "O código do resíduo deve conter no máximo 20 caracteres.")
        String code,

        @NotNull(message = "Informe se o tipo de resíduo é reciclável ou não.")
        boolean isRecyclable
) {
}
