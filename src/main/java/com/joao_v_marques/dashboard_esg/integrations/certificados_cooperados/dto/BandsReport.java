package com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

// GET /api/v1/bonus-points/bands-report
@JsonIgnoreProperties(ignoreUnknown = true)
public record BandsReport(
        int year,
        int totalMembers,
        List<BandCount> bands
) {
}
