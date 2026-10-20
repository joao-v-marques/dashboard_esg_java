package com.joao_v_marques.dashboard_esg.nips.nip_status.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NipStatusRequest(
        @NotBlank(message = "Informe o nome do status da NIP.")
        @Size(max = 255, message = "O nome do status deve conter no máximo 255 caracteres.")
        String name,

        String description
) {
}
