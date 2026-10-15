package com.joao_v_marques.dashboard_esg.wastes.waste_record;

import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import com.joao_v_marques.dashboard_esg.wastes.waste_record.dto.WasteRecordRequest;
import com.joao_v_marques.dashboard_esg.wastes.waste_record.dto.WasteRecordResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/waste-records")
public class WasteRecordController {

    private final WasteRecordService wasteRecordService;

    public WasteRecordController(WasteRecordService wasteRecordService) {
        this.wasteRecordService = wasteRecordService;
    }

    @GetMapping
    public List<WasteRecordResponse> findAll() {
        return wasteRecordService.findAll();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<WasteRecordResponse> create(@Valid @RequestBody WasteRecordRequest request, @AuthenticationPrincipal UserPrincipal currentUser) {
        WasteRecordResponse created = wasteRecordService.create(request, currentUser);

        URI location = URI.create("/api/waste-records/" + created.id());

        return ResponseEntity.created(location).body(created);
    }
}
