package com.joao_v_marques.dashboard_esg.lawsuits.subject_matter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubjectMatterRequest(
        @NotBlank(message = "Preencha o nome do objeto")
        @Size(max = 255, message = "O nome do objeto deve conter no máximo 255 caracteres")
        String name
) {
}
