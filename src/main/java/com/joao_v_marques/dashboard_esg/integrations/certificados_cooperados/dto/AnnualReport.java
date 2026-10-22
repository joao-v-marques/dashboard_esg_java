package com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

// GET /api/v1/cooperative-members/annual-report. Só os campos usados pelo dashboard
@JsonIgnoreProperties(ignoreUnknown = true)
public record AnnualReport(
        int year,
        int totalMembers,
        int membersTrainedInCooperativism,
        List<Integer> availableYears,
        List<AnnualReportMember> members
) {
}
