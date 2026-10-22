package com.joao_v_marques.dashboard_esg.cooperative_members.dashboard.dto;

// Carga em minutos, como o curso é lançado no certificados-cooperados; converter para horas é do front, para o
// número exibido e o exportado nascerem da mesma conta. null quando a versão de lá ainda não devolve o campo
public record MemberTrainingResponse(
        String memberName,
        int totalCourses,
        Integer totalMinutes
) {
}
