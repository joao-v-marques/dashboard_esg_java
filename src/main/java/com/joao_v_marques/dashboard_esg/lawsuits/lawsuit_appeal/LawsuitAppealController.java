package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal;

import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal.dto.LawsuitAppealResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Mapeado em /api para expor tanto a lista geral (/lawsuit-appeals) quanto a rota aninhada ao processo (/lawsuits/{id}/appeals)
@RestController
@RequestMapping("/api")
public class LawsuitAppealController {

    private final LawsuitAppealService lawsuitAppealService;

    public LawsuitAppealController(LawsuitAppealService lawsuitAppealService) {
        this.lawsuitAppealService = lawsuitAppealService;
    }

    // GET de todos os recursos de processo cadastrados no sistema
    @GetMapping("/lawsuit-appeals")
    public List<LawsuitAppealResponse> findAll() {
        return lawsuitAppealService.findAll();
    }

    // GET dos recursos de um processo específico
    @GetMapping("/lawsuits/{lawsuitId}/appeals")
    public List<LawsuitAppealResponse> findAllByLawsuit(@PathVariable Integer lawsuitId) {
        return lawsuitAppealService.findAllByLawsuit(lawsuitId);
    }
}
