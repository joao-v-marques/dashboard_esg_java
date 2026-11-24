package com.joao_v_marques.dashboard_esg.suppliers.qualification_result;

import com.joao_v_marques.dashboard_esg.suppliers.qualification_result.dto.QualificationResultRequest;
import com.joao_v_marques.dashboard_esg.suppliers.qualification_result.dto.QualificationResultResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/qualification-results")
public class QualificationResultController {

    private final QualificationResultService qualificationResultService;

    public QualificationResultController(QualificationResultService qualificationResultService) {
        this.qualificationResultService = qualificationResultService;
    }

    // GET de todos os resultados de qualificação cadastrados no sistema
    @GetMapping
    public List<QualificationResultResponse> findAll() {
        return qualificationResultService.findAll();
    }

    // POST de um novo resultado de qualificação no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<QualificationResultResponse> create(@Valid @RequestBody QualificationResultRequest request) {
        QualificationResultResponse created = qualificationResultService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de um resultado de qualificação já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<QualificationResultResponse> update(@PathVariable Integer id, @Valid @RequestBody QualificationResultRequest request) {
        QualificationResultResponse updated = qualificationResultService.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para desativar um resultado de qualificação já existente
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<QualificationResultResponse> deactivate(@PathVariable Integer id) {
        QualificationResultResponse deactivated = qualificationResultService.deactivate(id);

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar um resultado de qualificação já existente
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<QualificationResultResponse> reactivate(@PathVariable Integer id) {
        QualificationResultResponse reactivated = qualificationResultService.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}
