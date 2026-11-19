package com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage.dto;

public record ProceedingStageResponse(
        Integer id,
        String name,
        boolean isActive
) {
}
