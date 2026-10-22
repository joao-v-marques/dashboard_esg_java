package com.joao_v_marques.dashboard_esg.cooperative_members.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

// Resposta única da aba de Cooperados: todos os indicadores do mesmo ano-base numa chamada só
public record CooperativeMemberDashboardResponse(
        int year,
        // Anos que o select de ano-base pode oferecer (vêm do /annual-report do certificados-cooperados)
        List<Integer> availableYears,
        List<PointsBandResponse> membersByPointsBand,
        TrainedInCooperativismResponse trainedInCooperativism,
        List<MemberTrainingResponse> trainingByMember,
        // null quando não há pesquisa cadastrada para o ano (nunca a de outro ano com o rótulo errado)
        BigDecimal satisfactionIndex,
        int registeredOccurrences
) {
}
