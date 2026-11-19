package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.dto;

public record LawsuitStatusResponse(
        Integer id,
        String name,
        boolean isActive
) {
}
