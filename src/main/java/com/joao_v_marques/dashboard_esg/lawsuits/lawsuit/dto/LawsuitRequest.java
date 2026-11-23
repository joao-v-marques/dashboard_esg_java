package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LawsuitRequest(

        @NotNull(message = "Informe a data do processo.")
        LocalDate lawsuitDate,

        // Padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (ex.: 0001234-56.2024.8.26.0100)
        @NotBlank(message = "Informe o número do processo.")
        @Pattern(regexp = "\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4}", message = "O número do processo deve seguir o padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO.")
        String caseNumber,

        @NotBlank(message = "Informe o autor do processo.")
        @Size(max = 255, message = "O autor do processo deve conter no máximo 255 caracteres.")
        String plaintiff,

        @NotBlank(message = "Informe o réu do processo.")
        @Size(max = 255, message = "O réu do processo deve conter no máximo 255 caracteres.")
        String defendant,

        // Coluna NUMERIC(15, 2) no banco: até 13 dígitos inteiros e 2 decimais
        @NotNull(message = "Informe o valor da causa.")
        @PositiveOrZero(message = "O valor da causa não pode ser negativo.")
        @Digits(integer = 13, fraction = 2, message = "O valor da causa deve conter no máximo 13 dígitos inteiros e 2 casas decimais.")
        BigDecimal claimValue,

        @NotNull(message = "Informe o objeto do processo.")
        @Positive(message = "Informe um objeto válido.")
        Integer subjectMatterId,

        @NotNull(message = "Informe o trâmite do processo.")
        @Positive(message = "Informe um trâmite válido.")
        Integer proceedingStageId,

        @NotNull(message = "Informe o status do processo.")
        @Positive(message = "Informe um status válido.")
        Integer statusId,

        @NotNull(message = "Informe a probabilidade de perda do processo.")
        @Positive(message = "Informe uma probabilidade de perda válida.")
        Integer lossProbabilityId
) {
}
