package com.joao_v_marques.dashboard_esg.users.sector;

import com.joao_v_marques.dashboard_esg.users.sector.dto.SectorRequest;
import com.joao_v_marques.dashboard_esg.users.sector.dto.SectorResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/sectors")
public class SectorController {

    private final SectorService sectorService;

    public SectorController(SectorService sectorService) {
        this.sectorService = sectorService;
    }

    // GET de todos os setores cadastrados no sistema
    @GetMapping
    public List<SectorResponse> findAll() {
        return sectorService.findAll();
    }

    // POST de um novo setor no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SectorResponse> create(@Valid @RequestBody SectorRequest request) {
        SectorResponse created = sectorService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de um setor já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SectorResponse> update(@PathVariable Integer id, @Valid @RequestBody SectorRequest request) {
        SectorResponse updated = sectorService.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para desativar um setor já existente
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<SectorResponse> deactivate(@PathVariable Integer id) {
        SectorResponse deactivated = sectorService.deactivate(id);

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar um setor já existente
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<SectorResponse> reactivate(@PathVariable Integer id) {
        SectorResponse reactivated = sectorService.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}
