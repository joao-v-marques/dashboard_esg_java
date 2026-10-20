package com.joao_v_marques.dashboard_esg.nip;

import com.joao_v_marques.dashboard_esg.nip.dto.NipNatureResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/nip-natures")
public class NipNatureController {

    private final NipNatureService nipNatureService;

    public NipNatureController(NipNatureService nipNatureService) {
        this.nipNatureService = nipNatureService;
    }

    @GetMapping
    public List<NipNatureResponse> findAll() {
        return nipNatureService.findAll();
    }
}
