package com.joao_v_marques.dashboard_esg.lawsuits.subject_matter.dto;

public record SubjectMatterResponse(
        Integer id,
        String name,
        boolean isActive
) {
}
