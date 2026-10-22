package com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;

// GET /api/v1/occurrences
@JsonIgnoreProperties(ignoreUnknown = true)
public record Occurrence(
        Integer id,
        LocalDate occurrenceDate
) {
}
