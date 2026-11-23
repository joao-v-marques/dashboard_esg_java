package com.joao_v_marques.dashboard_esg.lawsuits.judging_body;

import com.joao_v_marques.dashboard_esg.lawsuits.judging_body.dto.JudgingBodyRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.judging_body.dto.JudgingBodyResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/judging-bodies")
public class JudgingBodyController {

    private final JudgingBodyService judgingBodyService;

    public JudgingBodyController(JudgingBodyService judgingBodyService) {
        this.judgingBodyService = judgingBodyService;
    }

    // GET de todos os órgãos julgadores cadastrados no sistema
    @GetMapping
    public List<JudgingBodyResponse> findAll() {
        return judgingBodyService.findAll();
    }

    // POST de um novo órgão julgador no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JudgingBodyResponse> create(@Valid @RequestBody JudgingBodyRequest request) {
        JudgingBodyResponse created = judgingBodyService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de um órgão julgador já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JudgingBodyResponse> update(@PathVariable Integer id, @Valid @RequestBody JudgingBodyRequest request) {
        JudgingBodyResponse updated = judgingBodyService.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para desativar um órgão julgador já existente
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<JudgingBodyResponse> deactivate(@PathVariable Integer id) {
        JudgingBodyResponse deactivated = judgingBodyService.deactivate(id);

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar um órgão julgador já existente
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<JudgingBodyResponse> reactivate(@PathVariable Integer id) {
        JudgingBodyResponse reactivated = judgingBodyService.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}
