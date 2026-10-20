package com.joao_v_marques.dashboard_esg.nips.nip_status;

import com.joao_v_marques.dashboard_esg.nips.nip_status.dto.NipStatusRequest;
import com.joao_v_marques.dashboard_esg.nips.nip_status.dto.NipStatusResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/nip-status")
public class NipStatusController {

    private final NipStatusService nipStatusService;

    public NipStatusController(NipStatusService nipStatusService) {
        this.nipStatusService = nipStatusService;
    }

    @GetMapping
    public List<NipStatusResponse> findAll() {
        return nipStatusService.findAll();
    }

    // POST de um novo status de NIP no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<NipStatusResponse> create(@Valid @RequestBody NipStatusRequest request) {
        NipStatusResponse created = nipStatusService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de um status de NIP já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<NipStatusResponse> update(@PathVariable Integer id, @Valid @RequestBody NipStatusRequest request) {
        NipStatusResponse updated = nipStatusService.update(id, request);

        return ResponseEntity.ok(updated);
    }
}
