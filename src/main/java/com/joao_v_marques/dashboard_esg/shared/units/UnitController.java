package com.joao_v_marques.dashboard_esg.shared.units;

import com.joao_v_marques.dashboard_esg.shared.units.dto.UnitRequest;
import com.joao_v_marques.dashboard_esg.shared.units.dto.UnitResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/units")
public class UnitController {

    private final UnitService unitService;

    public UnitController(UnitService unitService) {
        this.unitService = unitService;
    }

    @GetMapping
    public List<UnitResponse> findAll() {
        return unitService.findAll();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UnitResponse> create(@Valid @RequestBody UnitRequest request) {
        UnitResponse created = unitService.create(request);

        URI location = URI.create("/api/units/" + created.id());

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UnitResponse> update(@PathVariable Integer id, @Valid @RequestBody UnitRequest request) {
        UnitResponse updated = unitService.update(id, request);

        return ResponseEntity.ok().body(updated);
    }
}
