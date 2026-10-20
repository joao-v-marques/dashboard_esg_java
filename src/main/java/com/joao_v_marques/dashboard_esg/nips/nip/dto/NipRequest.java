package com.joao_v_marques.dashboard_esg.nips.nip.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record NipRequest(

        @NotBlank(message = "Informe o número da NIP.")
        @Size(max = 15, message = "O número da NIP deve conter no máximo 15 caracteres.")
        String nipNumber,

        @NotNull(message = "Informe a data de notificação da NIP.")
        LocalDate notificationDate,

        @NotBlank(message = "Informe o código da demanda.")
        @Size(max = 50, message = "O código da demanda deve conter no máximo 50 caracteres.")
        String demandCode,

        @NotBlank(message = "Informe o protocolo da NIP.")
        @Size(max = 50, message = "O protocolo deve conter no máximo 50 caracteres.")
        String protocolCode,

        @NotBlank(message = "Informe o nome do beneficiário.")
        @Size(max = 150, message = "O nome do beneficiário deve conter no máximo 150 caracteres.")
        String beneficiaryName,

        @NotBlank(message = "Informe o CPF do beneficiário.")
        @Pattern(regexp = "\\d{11}", message = "O CPF deve conter 11 dígitos, apenas números.")
        String beneficiaryCpf,

        String description,

        String responseDescription,

        @NotNull(message = "Informe o status da NIP.")
        @Positive(message = "Informe um status válido.")
        Integer statusId,

        @NotNull(message = "Informe a natureza da NIP.")
        @Positive(message = "Informe uma natureza válida.")
        Integer natureId
) {
}
