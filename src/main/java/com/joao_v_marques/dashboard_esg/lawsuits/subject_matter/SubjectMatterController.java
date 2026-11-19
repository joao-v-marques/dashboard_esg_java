package com.joao_v_marques.dashboard_esg.lawsuits.subject_matter;

import com.joao_v_marques.dashboard_esg.lawsuits.subject_matter.dto.SubjectMatterRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.subject_matter.dto.SubjectMatterResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/subject-matters")
public class SubjectMatterController {

    private final SubjectMatterService subjectMatterService;

    public SubjectMatterController(SubjectMatterService subjectMatterService) {
        this.subjectMatterService = subjectMatterService;
    }

    // GET de todos os objetos cadastrados no sistema
    @GetMapping
    public List<SubjectMatterResponse> findAll() {
        return subjectMatterService.findAll();
    }

    // POST de um novo objeto no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SubjectMatterResponse> create(@Valid @RequestBody SubjectMatterRequest request) {
        SubjectMatterResponse created = subjectMatterService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de um objeto já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SubjectMatterResponse> update(@PathVariable Integer id, @Valid @RequestBody SubjectMatterRequest request) {
        SubjectMatterResponse updated = subjectMatterService.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para desativar um objeto já existente
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<SubjectMatterResponse> deactivate(@PathVariable Integer id) {
        SubjectMatterResponse deactivated = subjectMatterService.deactivate(id);

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar um objeto já existente
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<SubjectMatterResponse> reactivate(@PathVariable Integer id) {
        SubjectMatterResponse reactivated = subjectMatterService.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}
