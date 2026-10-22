package com.joao_v_marques.dashboard_esg.cooperative_members.dashboard;

import com.joao_v_marques.dashboard_esg.cooperative_members.dashboard.dto.CooperativeMemberDashboardResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cooperative-members")
public class CooperativeMemberDashboardController {

    private final CooperativeMemberDashboardService cooperativeMemberDashboardService;

    public CooperativeMemberDashboardController(CooperativeMemberDashboardService cooperativeMemberDashboardService) {
        this.cooperativeMemberDashboardService = cooperativeMemberDashboardService;
    }

    // GET dos indicadores da aba de Cooperados. Sem year assume o ano corrente
    @GetMapping("/dashboard")
    public CooperativeMemberDashboardResponse getDashboard(@RequestParam(required = false) Integer year) {
        return cooperativeMemberDashboardService.getDashboard(year);
    }
}
