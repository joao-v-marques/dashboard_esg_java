package com.joao_v_marques.dashboard_esg.lawsuits.loss_probability;

import com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.dto.LossProbabilityRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.dto.LossProbabilityResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/loss-probabilities")
public class LossProbabilityController {

    private final LossProbabilityService lossProbabilityService;

    public LossProbabilityController(LossProbabilityService lossProbabilityService) {
        this.lossProbabilityService = lossProbabilityService;
    }

    // GET de todas as probabilidades de perda cadastradas no sistema
    @GetMapping
    public List<LossProbabilityResponse> findAll() {
        return lossProbabilityService.findAll();
    }

    // POST de uma nova probabilidade de perda no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<LossProbabilityResponse> create(@Valid @RequestBody LossProbabilityRequest request) {
        LossProbabilityResponse created = lossProbabilityService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de uma probabilidade de perda já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<LossProbabilityResponse> update(@PathVariable Integer id, @Valid @RequestBody LossProbabilityRequest request) {
        LossProbabilityResponse updated = lossProbabilityService.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para desativar uma probabilidade de perda já existente
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<LossProbabilityResponse> deactivate(@PathVariable Integer id) {
        LossProbabilityResponse deactivated = lossProbabilityService.deactivate(id);

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar uma probabilidade de perda já existente
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<LossProbabilityResponse> reactivate(@PathVariable Integer id) {
        LossProbabilityResponse reactivated = lossProbabilityService.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}
