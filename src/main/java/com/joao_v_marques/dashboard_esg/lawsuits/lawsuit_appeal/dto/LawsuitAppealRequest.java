package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

// O processo vem pela URL (/api/lawsuits/{lawsuitId}/appeals) e a sequência é calculada no service
public record LawsuitAppealRequest(

        @NotNull(message = "Informe a data do recurso.")
        LocalDate appealDate,

        @NotBlank(message = "Informe o número do recurso.")
        @Size(max = 35, message = "O número do recurso deve conter no máximo 35 caracteres.")
        String appealNumber,

        @NotBlank(message = "Informe o recorrente.")
        @Size(max = 255, message = "O recorrente deve conter no máximo 255 caracteres.")
        String appellant,

        @NotBlank(message = "Informe o recorrido.")
        @Size(max = 255, message = "O recorrido deve conter no máximo 255 caracteres.")
        String appellee,

        // Coluna NUMERIC(15, 2) no banco: até 13 dígitos inteiros e 2 decimais
        @NotNull(message = "Informe o valor da causa.")
        @PositiveOrZero(message = "O valor da causa não pode ser negativo.")
        @Digits(integer = 13, fraction = 2, message = "O valor da causa deve conter no máximo 13 dígitos inteiros e 2 casas decimais.")
        BigDecimal claimValue,

        @NotNull(message = "Informe o órgão julgador do recurso.")
        @Positive(message = "Informe um órgão julgador válido.")
        Integer judgingBodyId,

        @NotNull(message = "Informe o status do recurso.")
        @Positive(message = "Informe um status válido.")
        Integer statusId,

        @NotNull(message = "Informe a probabilidade de perda do recurso.")
        @Positive(message = "Informe uma probabilidade de perda válida.")
        Integer lossProbabilityId
) {
}
