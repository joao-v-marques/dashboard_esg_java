package com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;

// GET /api/v1/satisfaction-surveys
@JsonIgnoreProperties(ignoreUnknown = true)
public record SatisfactionSurvey(
        Integer id,
        int surveyYear,
        BigDecimal satisfactionIndex
) {
}
