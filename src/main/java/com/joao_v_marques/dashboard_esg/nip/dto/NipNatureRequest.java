package com.joao_v_marques.dashboard_esg.nip.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NipNatureRequest(
        @NotBlank(message = "Informe o nome da natureza da NIP.")
        @Size(max = 255, message = "O nome da natureza deve conter no máximo 255 caracteres.")
        String name,

        String description
) {
}
