package com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Integer em totalMinutes de propósito: o campo só existe a partir da versão do certificados-cooperados que o
// devolve no relatório anual. Com a versão anterior no ar ele vem null, e não zero
@JsonIgnoreProperties(ignoreUnknown = true)
public record AnnualReportMember(
        Integer id,
        String name,
        int totalCourses,
        Integer totalMinutes
) {
}
