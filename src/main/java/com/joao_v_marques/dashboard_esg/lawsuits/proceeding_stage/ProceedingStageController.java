package com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage;

import com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage.dto.ProceedingStageRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage.dto.ProceedingStageResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/proceeding-stages")
public class ProceedingStageController {

    private final ProceedingStageService proceedingStageService;

    public ProceedingStageController(ProceedingStageService proceedingStageService) {
        this.proceedingStageService = proceedingStageService;
    }

    // GET de todos os trâmites cadastrados no sistema
    @GetMapping
    public List<ProceedingStageResponse> findAll() {
        return proceedingStageService.findAll();
    }

    // POST de um novo trâmite no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProceedingStageResponse> create(@Valid @RequestBody ProceedingStageRequest request) {
        ProceedingStageResponse created = proceedingStageService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de um trâmite já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProceedingStageResponse> update(@PathVariable Integer id, @Valid @RequestBody ProceedingStageRequest request) {
        ProceedingStageResponse updated = proceedingStageService.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para desativar um trâmite já existente
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<ProceedingStageResponse> deactivate(@PathVariable Integer id) {
        ProceedingStageResponse deactivated = proceedingStageService.deactivate(id);

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar um trâmite já existente
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<ProceedingStageResponse> reactivate(@PathVariable Integer id) {
        ProceedingStageResponse reactivated = proceedingStageService.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}
