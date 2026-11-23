package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal;

import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal.dto.LawsuitAppealRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal.dto.LawsuitAppealResponse;
import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
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

    // POST de um novo recurso vinculado a um processo
    @PostMapping(value = "/lawsuits/{lawsuitId}/appeals", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<LawsuitAppealResponse> create(@PathVariable Integer lawsuitId, @Valid @RequestBody LawsuitAppealRequest request, @AuthenticationPrincipal UserPrincipal currentUser) {
        LawsuitAppealResponse created = lawsuitAppealService.create(lawsuitId, request, currentUser);

        // O recurso criado fica em /api/lawsuit-appeals/{id}, não na rota aninhada ao processo
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/lawsuit-appeals/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }
}
