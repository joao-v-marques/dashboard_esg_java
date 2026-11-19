package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record LawsuitResponse(
        Integer id,
        LocalDate lawsuitDate,
        String caseNumber,
        String plaintiff,
        String defendant,
        BigDecimal claimValue,
        Integer subjectMatterId,
        String subjectMatterName,
        Integer proceedingStageId,
        String proceedingStageName,
        Integer statusId,
        String statusName,
        Integer lossProbabilityId,
        String lossProbabilityName,
        Integer insertedById,
        String insertedByName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        Integer updatedById,
        String updatedByName,
        boolean isActive
) {
}
