package com.joao_v_marques.dashboard_esg.wastes.waste_type;

import com.joao_v_marques.dashboard_esg.wastes.waste_type.dto.WasteTypeRequest;
import com.joao_v_marques.dashboard_esg.wastes.waste_type.dto.WasteTypeResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/waste-types")
public class WasteTypesController {

    private final WasteTypeService wasteTypeService;

    public WasteTypesController(WasteTypeService wasteTypeService) {
        this.wasteTypeService = wasteTypeService;
    }

    @GetMapping
    public List<WasteTypeResponse> findAll() {
        return wasteTypeService.findAll();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<WasteTypeResponse> create(@Valid @RequestBody WasteTypeRequest request) {
        WasteTypeResponse created = wasteTypeService.create(request);

        URI location = URI.create("/api/waste-types" + created.id());

        return ResponseEntity.created(location).body(created);
    }

}
