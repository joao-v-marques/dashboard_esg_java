package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LawsuitStatusRequest(
        @NotBlank(message = "Preencha o nome do status do processo")
        @Size(max = 255, message = "O nome do status do processo deve conter no máximo 255 caracteres")
        String name
) {
}
