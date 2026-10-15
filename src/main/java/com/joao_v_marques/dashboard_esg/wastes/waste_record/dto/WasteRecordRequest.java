package com.joao_v_marques.dashboard_esg.wastes.waste_record.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WasteRecordRequest(

        @NotNull(message = "Informe a data do registro.")
        LocalDate recordDate,

        @NotNull(message = "Informe a unidade em que foi realizado o registro.")
        @Positive(message = "Informe uma unidade válida.")
        Integer unitId,

        @NotNull(message = "Informe o tipo do resíduo.")
        @Positive(message = "Informe um tipo de resíduo válida")
        Integer wasteTypeId,

        @NotNull(message = "Informe o peso dos resíduos em KG.")
        BigDecimal weightKg,

        @Size(max = 500, message = "As observações devem conter no máximo 500 caracteres")
        String observations
) {
}
