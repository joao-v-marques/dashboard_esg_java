package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status;

import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.dto.LawsuitStatusRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.dto.LawsuitStatusResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/lawsuit-status")
public class LawsuitStatusController {

    private final LawsuitStatusService lawsuitStatusService;

    public LawsuitStatusController(LawsuitStatusService lawsuitStatusService) {
        this.lawsuitStatusService = lawsuitStatusService;
    }

    // GET de todos os status de processo cadastrados no sistema
    @GetMapping
    public List<LawsuitStatusResponse> findAll() {
        return lawsuitStatusService.findAll();
    }

    // POST de um novo status de processo no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<LawsuitStatusResponse> create(@Valid @RequestBody LawsuitStatusRequest request) {
        LawsuitStatusResponse created = lawsuitStatusService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de um status de processo já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<LawsuitStatusResponse> update(@PathVariable Integer id, @Valid @RequestBody LawsuitStatusRequest request) {
        LawsuitStatusResponse updated = lawsuitStatusService.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para desativar um status de processo já existente
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<LawsuitStatusResponse> deactivate(@PathVariable Integer id) {
        LawsuitStatusResponse deactivated = lawsuitStatusService.deactivate(id);

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar um status de processo já existente
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<LawsuitStatusResponse> reactivate(@PathVariable Integer id) {
        LawsuitStatusResponse reactivated = lawsuitStatusService.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}
