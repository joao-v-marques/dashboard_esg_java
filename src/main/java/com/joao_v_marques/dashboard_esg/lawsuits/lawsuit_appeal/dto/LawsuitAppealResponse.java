package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record LawsuitAppealResponse(
        Integer id,
        Integer lawsuitId,
        String lawsuitCaseNumber,
        LocalDate appealDate,
        String appealNumber,
        String appellant,
        String appellee,
        BigDecimal claimValue,
        Integer judgingBodyId,
        String judgingBodyName,
        Integer statusId,
        String statusName,
        Integer lossProbabilityId,
        String lossProbabilityName,
        Integer appealSequence,
        Integer insertedById,
        String insertedByName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        Integer updatedById,
        String updatedByName,
        boolean isActive
) {
}
