package com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BandCount(
        int band,
        int lowerBoundPercent,
        int upperBoundPercent,
        int memberCount
) {
}
