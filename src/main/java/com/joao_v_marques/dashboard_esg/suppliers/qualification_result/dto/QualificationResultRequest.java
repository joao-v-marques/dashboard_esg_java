package com.joao_v_marques.dashboard_esg.suppliers.qualification_result.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record QualificationResultRequest(
        @NotBlank(message = "Preencha o nome do resultado de qualificação")
        @Size(max = 100, message = "O nome do resultado de qualificação deve conter no máximo 100 caracteres")
        String name
) {
}
